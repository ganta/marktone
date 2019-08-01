export enum DirectoryEntityType {
    USER = 'user',
    ORGANIZATION = 'org',
    GROUP = 'group',
}

export interface DirectoryEntity {
    type: DirectoryEntityType;
    id: number;
    code: string;
    name: string;
    avatar: string;
}
