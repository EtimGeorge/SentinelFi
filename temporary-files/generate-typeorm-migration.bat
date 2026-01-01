@echo off
set PATH=%~dp0\..\node_modules\.bin;%PATH%
typeorm-ts-node-commonjs -d ormconfig.ts migration:generate %1
