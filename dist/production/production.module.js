"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const production_service_1 = require("./production.service");
const production_controller_1 = require("./production.controller");
const inventory_module_1 = require("../inventory/inventory.module");
const entities_1 = require("../database/entities");
let ProductionModule = class ProductionModule {
};
exports.ProductionModule = ProductionModule;
exports.ProductionModule = ProductionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.ProductionPlan,
                entities_1.WorkOrder,
                entities_1.MaterialIssue,
                entities_1.ProductionResult,
                entities_1.BOM,
                entities_1.BOMItem,
                entities_1.Product,
                entities_1.Warehouse,
                entities_1.Stock,
                entities_1.User
            ]),
            inventory_module_1.InventoryModule,
        ],
        controllers: [production_controller_1.ProductionController],
        providers: [production_service_1.ProductionService],
        exports: [production_service_1.ProductionService],
    })
], ProductionModule);
//# sourceMappingURL=production.module.js.map