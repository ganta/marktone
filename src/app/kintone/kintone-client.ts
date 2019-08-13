import { DirectoryEntity, DirectoryEntityType, DirectoryEntityTypeUtil } from './directory-entity';

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
        entities: {
            entityType: string;
            id: string;
            code: string;
            name: string;
        }[];
    };
    success: boolean;
}

class DirectoryEntityCollection {
    users: DirectoryEntity[];

    orgs: DirectoryEntity[];

    groups: DirectoryEntity[];

    constructor(args: {
        users: DirectoryEntity[]; orgs: DirectoryEntity[]; groups: DirectoryEntity[];
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

export class KintoneClient {
    private static presetOrganizationImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/organization_48.png';

    private static presetGroupImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/group_48.png';

    private static searchAPI = '/k/api/directory/search.json';

    private static listDirectoryEntityByIdAndType = '/k/api/directory/listByIdAndType.json';

    private readonly loginUser: LoginUser;

    private readonly spaceId: number | null;

    constructor() {
        this.loginUser = KintoneClient.getLoginUser();
        this.spaceId = KintoneClient.getSpaceId();
    }

    static getLoginUser(): LoginUser {
        return JSON.parse(document.body.dataset.LoginUser as string);
    }

    static getSpaceId(): number | null {
        const match = window.location.hash.match(/\/space\/(\d+)\//);
        return match ? parseInt(match[1], 10) : null;
    }

    async ListDirectoryEntityByIdAndType(idAndTypes: { id: string; type: string }[]): Promise<DirectoryEntity[]> {
        const requestBody = { idAndTypes };
        const params = new URLSearchParams();
        params.append('_lc', this.loginUser.language);
        params.append('_ref', encodeURI(window.location.href));

        const url = `${KintoneClient.listDirectoryEntityByIdAndType}?${params.toString()}`;

        const rawResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(requestBody),
        });
        const response = await rawResponse.json() as ListDirectoryEntityResponse;

        return response.result.entities.map((entity) => {
            return ({
                type: DirectoryEntityTypeUtil.valueOf(entity.entityType),
                id: parseInt(entity.id, 10),
                code: entity.code,
                name: entity.name,
                avatar: '',
            });
        });
    }

    async searchDirectory(term: string): Promise<DirectoryEntityCollection> {
        const requestBody = {
            term,
            appId: null,
            recordId: null,
            spaceId: this.spaceId,
        };
        const params = new URLSearchParams();
        params.append('_lc', this.loginUser.language);
        params.append('_ref', encodeURI(window.location.href));

        const url = `${KintoneClient.searchAPI}?${params.toString()}`;

        const rawResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(requestBody),
        });
        const response = await rawResponse.json() as SearchDirectoryResponse;

        const users = response.result.users.map<DirectoryEntity>(u => ({
            type: DirectoryEntityType.USER,
            id: parseInt(u.id, 10),
            code: u.code,
            name: u.name,
            avatar: u.photo.size_24,
        }));
        const orgs = response.result.orgs.map<DirectoryEntity>(o => ({
            type: DirectoryEntityType.ORGANIZATION,
            id: parseInt(o.id, 10),
            code: o.code,
            name: o.name,
            avatar: KintoneClient.presetOrganizationImageURL,
        }));
        const groups = response.result.groups.map<DirectoryEntity>(g => ({
            type: DirectoryEntityType.GROUP,
            id: parseInt(g.id, 10),
            code: g.code,
            name: g.name,
            avatar: KintoneClient.presetGroupImageURL,
        }));

        return new DirectoryEntityCollection({ users, orgs, groups });
    }

    async findUserByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await this.searchDirectory(code);
        const user = collection.users.find(entity => entity.code === code);
        return user || null;
    }

    async findOrganizationByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await this.searchDirectory(code);
        const organization = collection.orgs.find(entity => entity.code === code);
        return organization || null;
    }

    async findGroupByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await this.searchDirectory(code);
        const group = collection.groups.find(entity => entity.code === code);
        return group || null;
    }
}

export default KintoneClient;
