export const SECRET_FIELDS = [
  "LINKQU_BASE_URL",
  "LINKQU_VA_PATH",
  "LINKQU_CLIENT_ID",
  "LINKQU_USERNAME",
  "LINKQU_PIN",
  "LINKQU_SERVER_KEY",
  "LINKQU_VA_BANK_CODE",
  "MIDTRANS_SERVER_KEY",
  "XENDIT_SECRET_KEY",
  "XENDIT_WEBHOOK_TOKEN",
] as const;

export type SecretField = (typeof SECRET_FIELDS)[number];

export const SECRET_FIELD_GROUPS: {
  provider: "linkqu" | "midtrans" | "xendit";
  label: string;
  fields: { key: SecretField; label: string; type?: "password" | "text" }[];
}[] = [
  {
    provider: "linkqu",
    label: "LinkQu (Virtual Account)",
    fields: [
      { key: "LINKQU_BASE_URL", label: "Base URL" },
      { key: "LINKQU_VA_PATH", label: "Endpoint path pembuatan VA" },
      { key: "LINKQU_CLIENT_ID", label: "Client ID" },
      { key: "LINKQU_USERNAME", label: "Username" },
      { key: "LINKQU_PIN", label: "PIN", type: "password" },
      { key: "LINKQU_SERVER_KEY", label: "Server Key", type: "password" },
      { key: "LINKQU_VA_BANK_CODE", label: "Kode Bank VA" },
    ],
  },
  {
    provider: "midtrans",
    label: "Midtrans",
    fields: [{ key: "MIDTRANS_SERVER_KEY", label: "Server Key", type: "password" }],
  },
  {
    provider: "xendit",
    label: "Xendit",
    fields: [
      { key: "XENDIT_SECRET_KEY", label: "Secret Key", type: "password" },
      { key: "XENDIT_WEBHOOK_TOKEN", label: "Webhook Token", type: "password" },
    ],
  },
];
