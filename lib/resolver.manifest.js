'use strict';

const request = require('request');


module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.manifest) {
            state.emit('info', 'manifest - using manifest from cache');
            return resolve(state);
        }

        state.emit('info', 'manifest - start fetching manifest from podlet');
        request(
            {
                method: 'GET',
                agent: state.agent,
                json: true,
                uri: state.uri,
            },
            (error, response, body) => {
                if (error) {
                    // console.log('manifest - error');
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    // console.log('manifest - http error', response.statusCode);
                    return reject(error);
                }

                state.emit('info', `manifest - got manifest from podlet`);
                state.manifest = body;
                resolve(state);
            }
        );
    });
