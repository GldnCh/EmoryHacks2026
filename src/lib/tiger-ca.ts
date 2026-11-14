import { rootCertificates } from "node:tls";

// Tiger Cloud services present a public certificate (Google Trust Services) once running, but a newly
// created service briefly serves one signed by Timescale's own CA, which isn't in Node's trust store.
// We trust Node's standard public CAs PLUS this one CA, so TLS stays fully verified (certificate chain +
// hostname) in both cases instead of turning verification off.
// Public certificate, not a secret. Source: the chain served by *.tsdb.cloud.timescale.com.
// Subject/issuer: O=Timescale Inc, CN=ca.timescale.com. Valid until Oct 20 2027.
// SHA-256 fingerprint: 06:5A:75:0D:0D:64:F6:2D:AC:DC:97:9E:3B:83:D2:11:95:40:71:EA:59:B8:F3:40:7C:4E:87:CA:68:34:64:57
export const TIMESCALE_CA = `-----BEGIN CERTIFICATE-----
MIIBpzCCAUygAwIBAgIQfH0seuAygeQX2lTU/eVncDAKBggqhkjOPQQDAjAzMRYw
FAYDVQQKEw1UaW1lc2NhbGUgSW5jMRkwFwYDVQQDExBjYS50aW1lc2NhbGUuY29t
MB4XDTI1MDEyMzE1NDMzOVoXDTI3MTAyMDE1NDMzOVowMzEWMBQGA1UEChMNVGlt
ZXNjYWxlIEluYzEZMBcGA1UEAxMQY2EudGltZXNjYWxlLmNvbTBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABKRa3FQeN67oUZK6PdG7FtZKYSv1WgJrZ64mfX9pLNlE
EeVzCnHIAcE9xsQ5j/gccgu9oyiJ/CcLPlkzBHe34M2jQjBAMA4GA1UdDwEB/wQE
AwICpDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTZ/kgiRgLuL0Tg7eYuwBps
25fwzDAKBggqhkjOPQQDAgNJADBGAiEAvH4JAMgGPL/BSARg47GxjBKJ9Mz+Q3CI
i21+5khjUHECIQCH1kzoKAKTnrkCuifWW9K0CzqXPLSjJBIh3jH2aaWZFQ==
-----END CERTIFICATE-----
`;

/**
 * pg connection settings for Tiger Cloud: the `sslmode=require` in Tiger's URL is removed because we set
 * TLS options explicitly (verify against public CAs + TIMESCALE_CA). Shared by the app and the seed script.
 */
export function tigerConnectionConfig(url: string) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return { connectionString: u.toString(), ssl: { ca: [...rootCertificates, TIMESCALE_CA], rejectUnauthorized: true } };
}
