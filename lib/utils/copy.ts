import { copyFile } from 'fs';

import fs from 'fs';
import {
    execSync,
} from 'child_process';

export default function copy(from: string, to: string) {
    try {
        fs.accessSync(to, fs.constants.R_OK);
    } catch (e) {
        fs.mkdirSync(to, {
            recursive: true,
        });
    }

    execSync(`cp -r ${from} ${to}`);

}