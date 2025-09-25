/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    PORT?: string
    DATABASE_URL: string
    JWT_SECRET: string
    MASTER_COMPANY_CODE: string
    MASTER_EMAIL: string
    MASTER_PASSWORD: string
    GEMINI_API_KEY: string
  }
}

declare module 'mongoose' {
  interface Connection {
    on(event: string, listener: Function): this;
  }
}