import jwt from "jsonwebtoken";

import { env } from "./env";

interface DocumentPermissions {
  edit: boolean;
  download: boolean;
  print: boolean;
}

interface OnlyOfficeConfigParams {
  fileKey: string;
  fileUrl: string;
  fileName: string;
  user: {
    id: string;
    name: string;
  };
  permissions?: Partial<DocumentPermissions>;
  callbackUrl?: string;
}

const defaultPermissions: DocumentPermissions = {
  edit: true,
  download: true,
  print: true,
};

export function createOnlyOfficeJwt(payload: Record<string, unknown>, expiresIn: string | number = "10m") {
  return jwt.sign(payload, env.server.ONLYOFFICE_JWT_SECRET, { expiresIn, algorithm: "HS256" });
}

export function buildOnlyOfficeConfig({
  fileKey,
  fileUrl,
  fileName,
  user,
  permissions,
  callbackUrl,
}: OnlyOfficeConfigParams) {
  const mergedPermissions = { ...defaultPermissions, ...permissions };

  const config = {
    document: {
      fileType: fileName.split(".").pop() ?? "docx",
      key: fileKey,
      title: fileName,
      url: fileUrl,
      permissions: mergedPermissions,
    },
    editorConfig: {
      mode: mergedPermissions.edit ? "edit" : "view",
      callbackUrl,
      user,
      customization: {
        autosave: true,
        commentAuthorOnly: false,
        hideRightMenu: false,
        logo: {
          image: `${env.server.APP_BASE_URL}/logo.svg`,
          imageDark: `${env.server.APP_BASE_URL}/logo-dark.svg`,
        },
        toolbarNoTabs: false,
      },
    },
  };

  const token = createOnlyOfficeJwt(config);

  return {
    baseUrl: env.server.ONLYOFFICE_BASE_URL,
    config,
    token,
  } as const;
}
