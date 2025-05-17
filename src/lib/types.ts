export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'MARIADB';

export type Env = {
  id: number;
  schedule: string;
  method: Method;
  url: string;
  props?: Record<string, string>;
};
