import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database-config.util';

const AppDataSource = new DataSource(buildDatabaseOptions(process.env));

export default AppDataSource;
