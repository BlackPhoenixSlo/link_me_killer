// The test stack's DNS server (docs/spec/phase-06-sites-and-domains.md, ticket 5): the app's Custom Domain check asks it, and
// only it (DNS_SERVERS in tests/e2e.env), so the specs decide every answer. A node:dgram UDP responder on port 53 for A, AAAA,
// TXT and CAA, plus a node:http control API the specs call on loopback (tests/compose.mail.yaml publishes it):
//   POST /records  {"<name>": {"A": ["203.0.113.10"], "AAAA": [...], "TXT": ["oflink-verify=…"], "CAA": [{"flags": 0,
//                  "tag": "issue", "value": "letsencrypt.org"}]}, "<other name>": null}
// Each named entry replaces that name's records whole; null removes the name. A name with no entry answers NXDOMAIN, a known
// name with none of the asked type an empty NOERROR (node:dns reads both as "no such record"). Every answer has TTL 0, so the
// resolver keeps nothing between checks. Runs on the app's own image (node:22-alpine), with no package.
// ASSUMPTION: no TCP listener: every answer here fits a UDP datagram, and the server never sets the truncated bit (rung 5).
// Overturned if a spec needs answers over 512 bytes.
import dgram from 'node:dgram';
import http from 'node:http';

const DNS_PORT = 53;
const CONTROL_PORT = 18053;
const TYPES = { A: 1, TXT: 16, AAAA: 28, CAA: 257 };
const zone = new Map(); // lower-cased name -> { A, AAAA, TXT, CAA }

// The question's name, type and the offset just after it. A truncated packet throws (and gets no answer) instead of looping.
function question(msg) {
  const labels = [];
  let at = 12;
  while (msg[at] !== 0) {
    if (at >= msg.length || msg[at] > 63 || at + 1 + msg[at] + 4 >= msg.length) throw new Error('malformed question');
    labels.push(msg.toString('latin1', at + 1, at + 1 + msg[at]));
    at += msg[at] + 1;
  }
  at += 1;
  return { name: labels.join('.').toLowerCase(), type: msg.readUInt16BE(at), end: at + 4 };
}

function ipv6Bytes(text) {
  const [head, tail = ''] = text.split('::');
  const groups = (part) => (part ? part.split(':') : []);
  const missing = 8 - groups(head).length - groups(tail).length;
  const all = [...groups(head), ...Array(text.includes('::') ? missing : 0).fill('0'), ...groups(tail)];
  return Buffer.from(all.flatMap((g) => [parseInt(g, 16) >> 8, parseInt(g, 16) & 0xff]));
}

function rdata(type, value) {
  if (type === TYPES.A) return Buffer.from(value.split('.').map(Number));
  if (type === TYPES.AAAA) return ipv6Bytes(value);
  if (type === TYPES.TXT) {
    const text = Buffer.from(value, 'utf8');
    const chunks = [];
    for (let i = 0; i < text.length || i === 0; i += 255) {
      const part = text.subarray(i, i + 255);
      chunks.push(Buffer.from([part.length]), part);
    }
    return Buffer.concat(chunks);
  }
  const tag = Buffer.from(value.tag, 'latin1');
  return Buffer.concat([Buffer.from([value.flags || 0, tag.length]), tag, Buffer.from(value.value, 'latin1')]);
}

function answer(msg) {
  const { name, type, end } = question(msg);
  const entry = zone.get(name);
  const kind = Object.keys(TYPES).find((k) => TYPES[k] === type);
  const values = (entry && kind && entry[kind]) || [];
  const header = Buffer.alloc(12);
  header.writeUInt16BE(msg.readUInt16BE(0), 0); // the id
  header.writeUInt16BE(0x8000 | (msg.readUInt16BE(2) & 0x0100) | 0x0080 | (entry ? 0 : 3), 2); // QR, RD copied, RA, rcode
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(values.length, 6);
  const records = values.map((value) => {
    const data = rdata(type, value);
    const fixed = Buffer.alloc(12);
    fixed.writeUInt16BE(0xc00c, 0); // the question's name
    fixed.writeUInt16BE(type, 2);
    fixed.writeUInt16BE(1, 4); // IN
    fixed.writeUInt32BE(0, 6); // TTL 0
    fixed.writeUInt16BE(data.length, 10);
    return Buffer.concat([fixed, data]);
  });
  return Buffer.concat([header, msg.subarray(12, end), ...records]);
}

const udp = dgram.createSocket('udp4');
udp.on('message', (msg, peer) => {
  try {
    udp.send(answer(msg), peer.port, peer.address);
  } catch {
    // a malformed query gets no answer
  }
});
udp.bind(DNS_PORT);

http.createServer((req, res) => {
  let body = '';
  req.on('data', (part) => { body += part; });
  req.on('end', () => {
    if (req.method !== 'POST' || req.url !== '/records') {
      res.writeHead(404).end();
      return;
    }
    try {
      for (const [name, records] of Object.entries(JSON.parse(body))) {
        if (records === null) zone.delete(name.toLowerCase());
        else zone.set(name.toLowerCase(), records);
      }
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
  });
}).listen(CONTROL_PORT);

console.log(`fake DNS: udp ${DNS_PORT}, control http ${CONTROL_PORT}`);
