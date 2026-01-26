import * as forge from "node-forge";

function readOctetString(node: forge.asn1.Asn1): string {
  if (node.type === forge.asn1.Type.OCTETSTRING && typeof node.value === "string") {
    return node.value;
  }
  if (node.constructed && Array.isArray(node.value)) {
    let out = "";
    for (const part of node.value as forge.asn1.Asn1[]) {
      out += readOctetString(part);
    }
    return out;
  }
  return "";
}

export function extractPkcs7Content(bytes: Uint8Array): string {
  const rawBytes = bytes.reduce(
    (acc, value) => acc + String.fromCharCode(value),
    ""
  );
  const buffer = forge.util.createBuffer(rawBytes);
  const asn1 = forge.asn1.fromDer(buffer);
  const msg = forge.pkcs7.messageFromAsn1(asn1);
  let raw = "";
  if (msg.content) {
    if (typeof msg.content === "string") {
      raw = msg.content;
    } else if (msg.content.length() > 0) {
      raw = msg.content.bytes();
    }
  }
  if (!raw && msg.rawCapture?.content) {
    raw = readOctetString(msg.rawCapture.content as forge.asn1.Asn1);
  }
  if (!raw) {
    throw new Error("No embedded content in PKCS#7 envelope.");
  }
  return forge.util.decodeUtf8(raw);
}
