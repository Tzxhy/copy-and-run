import { accessSync, mkdirSync, readdirSync, statSync } from 'fs';
import path from 'path';
import {
    AsyncParallelHook,
    AsyncSeriesHook,
    SyncHook,
} from 'tapable';
import copy from './utils/copy';
import { getAllFilePath } from './utils/files';

function start() {
    let conf: Config[] | Config;
    try {
        conf = require(path.resolve('copy-and-run.js'));
    } catch(e) {
        console.error('项目配置文件读取失败');
        return;
    };

    if (Array.isArray(conf)) {
        conf.forEach(c => startSingleJob(c));
    } else {
        startSingleJob(conf);
    }
}

function startSingleJob(conf: Config) {
    const context = conf.context;
    if (!context || !statSync(context).isDirectory()) {
        console.error('context 错误');
        return;
    }

    const outputDir = path.join(context, conf.targetDir);
    
    const hooks = {
        initialize: new SyncHook(['outputDir']),
        beforeCopy: new SyncHook(['filePath']),
        afterCopy: new AsyncParallelHook(['filePath']),

        beforeRun: new SyncHook(['manifestPath']),
        run: new AsyncSeriesHook(['outputDir']),
        afterRun: new AsyncSeriesHook(['rpkPath']),

        done: new AsyncParallelHook(['outputDir']),
    };

    const plugins = conf.plugins || [];

    plugins.forEach((plugin: any) => {
        plugin.apply(hooks);
    });

    hooks.initialize.call(outputDir);

    try {
        accessSync(outputDir);
    } catch(_e) {
        mkdirSync(outputDir, {
            recursive: true,
        });
    }

    let fileList: string[] = [];
    if (conf.fileInclude && conf.fileInclude.length) {
        conf.fileInclude.forEach(p => {
            fileList.push(...getAllFilePath(path.join(context, p)));
        });
    }
    fileList.forEach(file => {
        hooks.beforeCopy.call(file);

        const outputFile = path.dirname(path.join(outputDir, file.replace(context + path.sep, '')));
        copy(file, outputFile);

        hooks.afterCopy.callAsync(path.join(outputFile, path.basename(file)), () => {});
    });

    hooks.beforeRun.call(fileList.filter(f => f.indexOf('manifest.json') >= 0)[0]);

    hooks.run.callAsync(outputDir, () => {
        const rpkPath = path.join(outputDir, 'dist', 'com.novel.quick.release.rpk')
        hooks.afterRun.callAsync(rpkPath, () => {
            hooks.done.callAsync(outputDir, () => {});
        });
    });
}

start();
