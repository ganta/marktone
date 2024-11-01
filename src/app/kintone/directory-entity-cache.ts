import type { DirectoryEntity } from "./DirectoryEntity.ts";

class DirectoryEntityCache {
  private readonly cache: { [key: string]: DirectoryEntity | null };

  constructor() {
    this.cache = {};
  }

  set(key: string, entity: DirectoryEntity | null): void {
    this.cache[key] = entity;
  }

  get(key: string): DirectoryEntity | null {
    return this.cache[key];
  }

  static serializer(...args: string[]): string {
    return JSON.stringify(args);
  }
}

export default DirectoryEntityCache;
