const searchAPI = '/k/api/directory/search.json';

interface SearchDirectoryResponse {
    result: {
        groups: {
            entityType: string;
            id: string;
            name: string;
        }[];
        orgs: {
            entityType: string;
            id: string;
            name: string;
        }[];
        users: {
            entityType: string;
            id: string;
            name: string;
            photo: {
                size_24: string;
            };
        }[];
    };
}

class Kintone {
    static async searchDirectory(term: string): Promise<SearchDirectoryResponse> {
        const requestBody = { term };

        const response = await fetch(searchAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(requestBody),
        });

        return response.json();
    }
}

export default Kintone;
