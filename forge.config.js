const {notarize} = require('@electron/notarize');
const fs = require("fs");
const path = require("path");

module.exports = {
    packagerConfig: {
        asar: true,
        osxSign: {
            "identity": process.env.APPLE_DEVELOPER_ID,
            "hardened-runtime": true,
            "entitlements": "./macos/entitlements.mac.plist",
            "entitlements-inherit": "./macos/entitlements.mac.inherit.plist",
            "signature-flags": "library"
        },
        osxNotarize: {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.TEAM_ID
        }
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: "airdrop-navigator"
            },
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                name: 'Airdrop Navigator',
                format: 'ULFO',
            }
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                options: {
                    maintainer: 'Dmitriy Kotov',
                    homepage: 'https://github.com/fewcatltd/navigator-client'
                }
            }
        }
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
    ],
    hooks: {
        postMake: async (forgeConfig, _) => {
            if (process.platform !== 'darwin') return;

            // Путь к каталогу с результатами сборки
            const outDir = forgeConfig.outputDirectory || 'out';
            const arch = process.arch === 'x64' ? 'intel' : 'arm';

            console.log(`Searching for .app file in directory: ${outDir}`);
            const findAppFile = (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.lstatSync(fullPath).isDirectory()) {
                        if (file.endsWith('.app')) {
                            return fullPath;
                        } else {
                            const appFile = findAppFile(fullPath);
                            if (appFile) return appFile;
                        }
                    }
                }
                return null;
            };

            // Поиск .app файла внутри каталога out
            const appPath = findAppFile(outDir);

            if (appPath) {
                console.log(`Found .app file at ${appPath}`);
                const namePostfix = arch === 'intel' ? 'intel' : `M_chip`;
                const newAppPath = path.join(outDir, `Airdrop Navigator-${namePostfix}.app`);
                fs.renameSync(appPath, newAppPath);
                console.log(`Renamed .app file to ${newAppPath}`);
                await notarize({
                    appBundleId: process.env.APPLE_BUNDLE_ID,
                    appPath: newAppPath,
                    appleId: process.env.APPLE_ID,
                    appleIdPassword: process.env.APPLE_ID_PASSWORD,
                    teamId: process.env.TEAM_ID
                });
            } else {
                console.error(`Cannot find .app file in ${outDir}`);
                throw new Error(`Cannot find .app file in ${outDir}`);
            }
        }
    },
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                draft: true,
                force: true,
                repository: {
                    owner: 'fewcatltd',
                    name: 'navigator-client'
                },
                prerelease: true
            }
        }
    ]
};
