"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDataModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const master_data_service_1 = require("./master-data.service");
const master_data_controller_1 = require("./master-data.controller");
const entities_1 = require("../database/entities");
let MasterDataModule = class MasterDataModule {
};
exports.MasterDataModule = MasterDataModule;
exports.MasterDataModule = MasterDataModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.Product,
                entities_1.Category,
                entities_1.Unit,
                entities_1.Supplier,
                entities_1.Customer,
                entities_1.Warehouse,
                entities_1.WarehouseLocation,
                entities_1.Stock
            ])
        ],
        controllers: [master_data_controller_1.MasterDataController],
        providers: [master_data_service_1.MasterDataService],
        exports: [master_data_service_1.MasterDataService],
    })
], MasterDataModule);
//# sourceMappingURL=master-data.module.js.map