import { DirectoryEntity, DirectoryEntityType } from './directory-entity';
import DirectoryEntityCache from './directory-entity-cache';

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

    private cache: DirectoryEntityCache;

    constructor(cache: DirectoryEntityCache) {
        this.cache = cache || new DirectoryEntityCache();
    }

    static getLoginUser(): LoginUser {
        return JSON.parse(document.body.dataset.LoginUser as string);
    }

    static async searchDirectory(term: string): Promise<DirectoryEntityCollection> {
        const requestBody = { term };

        const rawResponse = await fetch(KintoneClient.searchAPI, {
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
            avatar: this.presetOrganizationImageURL,
        }));
        const groups = response.result.groups.map<DirectoryEntity>(g => ({
            type: DirectoryEntityType.GROUP,
            id: parseInt(g.id, 10),
            code: g.code,
            name: g.name,
            avatar: this.presetGroupImageURL,
        }));

        return new DirectoryEntityCollection({ users, orgs, groups });
    }

    static async findUserByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await KintoneClient.searchDirectory(code);
        const user = collection.users.find(entity => entity.code === code);
        return user || null;
    }

    static async findOrganizationByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await KintoneClient.searchDirectory(code);
        const organization = collection.orgs.find(entity => entity.code === code);
        return organization || null;
    }

    static async findGroupByCode(code: string): Promise<DirectoryEntity | null> {
        const collection = await KintoneClient.searchDirectory(code);
        const group = collection.groups.find(entity => entity.code === code);
        return group || null;
    }
}

export default KintoneClient;
