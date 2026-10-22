const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Read POST body if present
    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', async () => {
        const bodyBuffer = Buffer.concat(bodyChunks);

        // Handle getGJLevels21.php (Level Search)
        if (pathname.includes('getGJLevels21.php')) {
            const searchParams = new URLSearchParams(bodyBuffer.toString());
            const queryStr = searchParams.get('str') || '*';

            // Query GDBrowser API for live level search
            const gdbUrl = `https://gdbrowser.com/api/search/${encodeURIComponent(queryStr)}`;
            https.get(gdbUrl, { headers: { 'User-Agent': 'GDPS/1.0' } }, (gRes) => {
                let data = '';
                gRes.on('data', c => data += c);
                gRes.on('end', () => {
                    try {
                        const levels = JSON.parse(data);
                        if (!Array.isArray(levels) || levels.length === 0) {
                            res.writeHead(200, { 'Content-Type': 'text/plain' });
                            return res.end('-1');
                        }

                        // Format levels into Geometry Dash format
                        const levelStrings = levels.map(l => {
                            const descB64 = Buffer.from(l.description || '').toString('base64');
                            return `1:${l.id}:2:${l.name}:3:${descB64}:5:${l.version || 1}:6:${l.playerID || 0}:9:${l.difficulty === 'Extreme Demon' ? 10 : 5}:10:${l.downloads || 0}:14:${l.likes || 0}:15:3:17:1:18:${l.stars || 10}`;
                        }).join('|');

                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end(`${levelStrings}#0:0:10#999999999`);
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('-1');
                    }
                });
            }).on('error', () => {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('-1');
            });
            return;
        }

        // Handle downloadGJLevel22.php (Level Download)
        if (pathname.includes('downloadGJLevel22.php')) {
            const searchParams = new URLSearchParams(bodyBuffer.toString());
            const levelId = searchParams.get('levelID') || '128';

            const gdbUrl = `https://gdbrowser.com/api/level/${encodeURIComponent(levelId)}`;
            https.get(gdbUrl, { headers: { 'User-Agent': 'GDPS/1.0' } }, (gRes) => {
                let data = '';
                gRes.on('data', c => data += c);
                gRes.on('end', () => {
                    try {
                        const meta = JSON.parse(data);
                        if (!meta.id) throw new Error('Not found');

                        const descB64 = Buffer.from(meta.description || '').toString('base64');
                        const levelData = meta.data || 'kS38,1_40_2_125_3_90_4_0,1_1_2_105_3_90_4_0;';
                        const levelDataB64 = (levelData.startsWith('H4sI') || levelData.startsWith('eJ'))
                            ? levelData
                            : Buffer.from(levelData).toString('base64');

                        const responseStr = `1:${meta.id}:2:${meta.name}:3:${descB64}:4:${levelDataB64}:5:${meta.version || 1}:6:${meta.playerID || 0}:10:${meta.downloads || 0}:12:0:14:${meta.likes || 0}:17:1:18:${meta.stars || 10}`;
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end(responseStr);
                    } catch (e) {
                        // Fallback sample level data
                        const fallbackData = 'H4sIAAAAAAAAC-x9SdIsKY_ghd4Lc2awf1VnqAPkAfoKbX32BpcEQkgeQ_aqrRaZ7wtJzKAZ_H_9d6h_3D_XP77_F_p_8Z-_7p_8';
                        const fallbackStr = `1:${levelId}:2:Custom Level ${levelId}:3::4:${fallbackData}:5:1:6:0:10:1000:12:0:14:100:17:1:18:10`;
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end(fallbackStr);
                    }
                });
            }).on('error', () => {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('-1');
            });
            return;
        }

        // Handle getGJSongInfo.php (Custom Songs)
        if (pathname.includes('getGJSongInfo.php')) {
            const searchParams = new URLSearchParams(bodyBuffer.toString());
            const songId = searchParams.get('songID') || '467339';
            const songUrl = `https://geometrydashcontent.b-cdn.net/songs/${songId}.mp3`;
            const gdResponse = `1~|~${songId}~|~2~|~Custom Song~|~3~|~1~|~4~|~Artist~|~5~|~5.2~|~10~|~${encodeURIComponent(songUrl)}`;
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(gdResponse);
            return;
        }

        // Default response
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('GD Private Server Running');
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`GD Private Server running on port ${PORT}`);
});
