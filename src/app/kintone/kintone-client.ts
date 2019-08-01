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

export class KintoneClient {
    private static presetOrganizationImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/organization_48.png';

    private static presetGroupImageURL = 'https://static.cybozu.com/contents/k/image/argo/preset/user/group_48.png';

    private static searchAPI = '/k/api/directory/search.json';

    private cache: DirectoryEntityCache;

    constructor(cache: DirectoryEntityCache) {
        this.cache = cache || new DirectoryEntityCache();
    }

    static async searchDirectory(term: string): Promise<SearchDirectoryResponse> {
        const requestBody = { term };

        const response = await fetch(KintoneClient.searchAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(requestBody),
        });

        return response.json();
    }

    static async findUserByCode(code: string): Promise<DirectoryEntity | null> {
        const response = await KintoneClient.searchDirectory(code);
        const userResp = response.result.users.find(u => u.code === code);
        if (!userResp) {
            return null;
        }

        return {
            type: DirectoryEntityType.USER,
            id: parseInt(userResp.id, 10),
            code: userResp.code,
            name: userResp.name,
            avatar: userResp.photo.size_24,
        };
    }

    static async findOrganizationByCode(code: string): Promise<DirectoryEntity | null> {
        const response = await KintoneClient.searchDirectory(code);
        const orgResp = response.result.orgs.find(o => o.code === code);
        if (!orgResp) {
            return null;
        }

        return {
            type: DirectoryEntityType.USER,
            id: parseInt(orgResp.id, 10),
            code: orgResp.code,
            name: orgResp.name,
            avatar: this.presetOrganizationImageURL,
        };
    }

    static async findGroupByCode(code: string): Promise<DirectoryEntity | null> {
        const response = await KintoneClient.searchDirectory(code);
        const groupResp = response.result.groups.find(g => g.code === code);
        if (!groupResp) {
            return null;
        }

        return {
            type: DirectoryEntityType.USER,
            id: parseInt(groupResp.id, 10),
            code: groupResp.code,
            name: groupResp.name,
            avatar: this.presetGroupImageURL,
        };
    }
}

export default KintoneClient;
