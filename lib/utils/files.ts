import fs from 'fs';
import path from 'path';

export function getAllFilePath(filePath: string): string[] {

    try {
        fs.accessSync(filePath, fs.constants.R_OK);
    } catch (e) {
        return [];
    }

    if (fs.statSync(filePath).isFile()) {
        return [filePath];
    }

    return fs.readdirSync(filePath).map(_p => {
        const nP = path.join(filePath, _p);
        return getAllFilePath(nP);
    }).flat();
}