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
        postMake: async (forgeConfig, makeResults) => {
            if (process.platform !== 'darwin') return;

            const outDir = forgeConfig.outputDirectory || 'out';
            const arch = process.arch === 'x64' ? 'intel' : 'arm';
            let appPath;

            for (const makeResult of makeResults) {
                if (makeResult.platform === 'darwin') {
                    for (const artifactPath of makeResult.artifacts) {
                        if (artifactPath.endsWith('.app')) {
                            appPath = artifactPath;
                            break;
                        }
                    }
                }
            }

            if (!appPath || !fs.existsSync(appPath)) {
                throw new Error(`Cannot find .app file in ${outDir}`);
            }

            await notarize({
                appBundleId: process.env.APPLE_BUNDLE_ID,
                appPath: appPath,
                appleId: process.env.APPLE_ID,
                appleIdPassword: process.env.APPLE_ID_PASSWORD,
                teamId: process.env.TEAM_ID
            });

            for (const makeResult of makeResults) {
                if (makeResult.platform === 'darwin') {
                    for (const artifactPath of makeResult.artifacts) {
                        if (artifactPath.endsWith('.dmg')) {
                            const parsedPath = path.parse(artifactPath);
                            const newArtifactPath = path.join(parsedPath.dir, `${parsedPath.name}-${arch}${parsedPath.ext}`);
                            fs.renameSync(artifactPath, newArtifactPath);
                        }
                    }
                }
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
