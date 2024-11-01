import {
  type DirectoryEntity,
  DirectoryEntityType,
  toDirectoryEntityType,
} from "./DirectoryEntity.ts";

interface SearchDirectoryUserResponse {
  entityType: string;
  id: string;
  code: string;
  name: string;
  photo: {
    size_24: string;
  };
}

interface SearchDirectoryOrganizationResponse {
  entityType: string;
  id: string;
  code: string;
  name: string;
}

interface SearchDirectoryGroupResponse {
  entityType: string;
  id: string;
  code: string;
  name: string;
}

interface SearchDirectoryResponse {
  result: {
    users: SearchDirectoryUserResponse[];
    orgs: SearchDirectoryOrganizationResponse[];
    groups: SearchDirectoryGroupResponse[];
  };
}

interface ListDirectoryEntityResponse {
  result: {
    entities: Array<{
      entityType: string;
      id: string;
      code: string;
      name: string;
    }>;
  };
  success: boolean;
}

interface UploadResponse {
  result: {
    fileKey: string;
    fileType: string;
    image: boolean;
    text: boolean;
    application: boolean;
    thumbnailable: boolean;
  };
  success: boolean;
}

class DirectoryEntityCollection {
  users: DirectoryEntity[];

  orgs: DirectoryEntity[];

  groups: DirectoryEntity[];

  constructor(args: {
    users: DirectoryEntity[];
    orgs: DirectoryEntity[];
    groups: DirectoryEntity[];
  }) {
    this.users = args.users;
    this.orgs = args.orgs;
    this.groups = args.groups;
  }

  flat(): DirectoryEntity[] {
    const entities: DirectoryEntity[] = [];
    entities.push(...this.users);
    entities.push(...this.orgs);
    entities.push(...this.groups);
    return entities;
  }
}

interface LoginUser {
  id: string;
  code: string;
  name: string;
  email: string;
  url: string;
  employeeNumber: string;
  phone: string;
  mobilePhone: string;
  extensionNumber: string;
  timezone: string;
  isGuest: boolean;
  language: string;
}

export default class KintoneClient {
  static defaultThumbnailWidth = 250;

  private static presetOrganizationImageURL =
    "https://static.cybozu.com/contents/k/image/argo/preset/user/organization_48.png";

  private static presetGroupImageURL =
    "https://static.cybozu.com/contents/k/image/argo/preset/user/group_48.png";

  private static fileIconBaseURL =
    "https://static.cybozu.com/contents/k/image/file";

  private static fileIconExtensions = [
    "txt",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "pdf",
    "zip",
  ];

  private static searchDirectoryAPI = "/directory/search.json";

  private static listDirectoryByIdAndTypeAPI =
    "/directory/listByIdAndType.json";

  private static downloadBlobAPI = "/blob/download.do";

  private static uploadBlobAPI = "/blob/upload.json";

  private readonly loginUser: LoginUser;

  private readonly spaceId: number | null;

  private readonly requestToken: string;

  constructor() {
    this.loginUser = KintoneClient.getLoginUser();
    this.spaceId = KintoneClient.getSpaceId();
    this.requestToken = KintoneClient.getRequestToken();
  }

  static getLoginUser(): LoginUser {
    return JSON.parse(document.body.dataset.loginUser as string) as LoginUser;
  }

  static getSpaceId(): number | null {
    const match = window.location.hash.match(/\/space\/(\d+)\//);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  static getRequestToken(): string {
    return document.body.dataset.requestToken || "";
  }

  static isSpacePage(): boolean {
    return window.location.hash.startsWith("#/space/");
  }

  static isPeoplePage(): boolean {
    return window.location.hash.startsWith("#/people/");
  }

  static isNotificationPage(): boolean {
    return window.location.hash.startsWith("#/ntf/");
  }

  static isAppRecordPage(): boolean {
    const pathname = window.location.pathname;
    return pathname.startsWith("/k/") && pathname.endsWith("/show");
  }

  static isGuestSpace(): boolean {
    return window.location.pathname.startsWith("/k/guest/");
  }

  static getDownloadURL(
    fileKey: string,
    additionalParams?: { [key: string]: string },
  ): string {
    const params = new URLSearchParams();
    params.append("fileKey", fileKey);
    params.append("_lc", KintoneClient.getLoginUser().language);
    params.append("_ref", encodeURI(window.location.href));

    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        params.append(key, value);
      }
    }

    return `${KintoneClient.getAPIPathPrefix()}${
      KintoneClient.downloadBlobAPI
    }?${params.toString()}`;
  }

  static getFileIconURL(fileName: string): string {
    const matched = fileName.toLowerCase().match(/.+\.(?<extension>\w+)$/);
    let iconName = "other";

    if (matched?.groups) {
      const extension = matched.groups.extension;
      if (KintoneClient.fileIconExtensions.includes(extension)) {
        iconName = extension;
      }
    }

    return `${KintoneClient.fileIconBaseURL}/${iconName}.png`;
  }

  private static getAPIPathPrefix(): string {
    if (!KintoneClient.isGuestSpace()) return "/k/api";

    const matched = window.location.pathname.match(
      /^\/k\/guest\/(?<spaceId>\d+)\//,
    );
    if (matched?.groups) {
      return `/k/guest/${matched.groups.spaceId}/api`;
    }

    throw new Error(`Unknown pathname: ${window.location.pathname}`);
  }

  async listDirectoryEntityByIdAndType(
    idAndTypes: Array<{ id: string; type: string }>,
  ): Promise<DirectoryEntity[]> {
    const requestBody = { idAndTypes };
    const response = await this.postToAPI<ListDirectoryEntityResponse>(
      KintoneClient.listDirectoryByIdAndTypeAPI,
      requestBody,
    );

    return response.result.entities.map(({ entityType, id, code, name }) => {
      return {
        type: toDirectoryEntityType(entityType),
        id,
        code,
        name,
        avatar: "",
      };
    });
  }

  async searchDirectory(term: string): Promise<DirectoryEntityCollection> {
    const requestBody = {
      term,
      appId: null,
      recordId: null,
      spaceId: this.spaceId,
    };
    const response = await this.postToAPI<SearchDirectoryResponse>(
      KintoneClient.searchDirectoryAPI,
      requestBody,
    );

    const users = response.result.users.map<DirectoryEntity>(
      ({ id, code, name, photo }) => ({
        type: DirectoryEntityType.USER,
        id,
        code,
        name,
        avatar: photo.size_24,
      }),
    );
    const orgs = response.result.orgs.map<DirectoryEntity>(
      ({ id, code, name }) => ({
        type: DirectoryEntityType.ORGANIZATION,
        id,
        code,
        name,
        avatar: KintoneClient.presetOrganizationImageURL,
      }),
    );
    const groups = response.result.groups.map<DirectoryEntity>(
      ({ id, code, name }) => ({
        type: DirectoryEntityType.GROUP,
        id,
        code,
        name,
        avatar: KintoneClient.presetGroupImageURL,
      }),
    );

    return new DirectoryEntityCollection({ users, orgs, groups });
  }

  async findUserByCode(code: string): Promise<DirectoryEntity | null> {
    const collection = await this.searchDirectory(code);
    const user = collection.users.find((entity) => entity.code === code);
    return user || null;
  }

  async findOrganizationByCode(code: string): Promise<DirectoryEntity | null> {
    const collection = await this.searchDirectory(code);
    const organization = collection.orgs.find((entity) => entity.code === code);
    return organization || null;
  }

  async findGroupByCode(code: string): Promise<DirectoryEntity | null> {
    const collection = await this.searchDirectory(code);
    const group = collection.groups.find((entity) => entity.code === code);
    return group || null;
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    params.append("checkThumbnail", "true");
    params.append("w", KintoneClient.defaultThumbnailWidth.toString());
    params.append("_lc", this.loginUser.language);
    params.append("_ref", encodeURI(window.location.href));

    const apiPath = `${KintoneClient.getAPIPathPrefix()}${
      KintoneClient.uploadBlobAPI
    }?${params.toString()}`;
    const rawResponse = await fetch(apiPath, {
      method: "POST",
      headers: {
        "X-Cybozu-RequestToken": this.requestToken,
      },
      body: formData,
    });
    return (await rawResponse.json()) as UploadResponse;
  }

  private async postToAPI<T>(path: string, requestBody: unknown): Promise<T> {
    const params = new URLSearchParams();
    params.append("_lc", this.loginUser.language);
    params.append("_ref", encodeURI(window.location.href));

    const apiPath = `${KintoneClient.getAPIPathPrefix()}${path}?${params.toString()}`;

    const rawResponse = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(requestBody),
    });
    return (await rawResponse.json()) as T;
  }
}
