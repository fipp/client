'use strict';

const Manifest = require('../lib/resolver.manifest.js');
const Client = require('../');
const State = require('../lib/state.js');
const Faker = require('../test/faker');
const lolex = require('lolex');

/**
 * NOTE I:
 * Cache control based on headers subract the time of the request
 * so we will not have an exact number to test on. Due to this, we
 * check if cache time are within a range.
 */

test('resolver.manifest() - object tag - should be PodletClientManifestResolver', () => {
    const manifest = new Manifest();
    expect(Object.prototype.toString.call(manifest)).toEqual(
        '[object PodletClientManifestResolver]'
    );
});

test('resolver.manifest() - "state.manifest" holds a manifest - should resolve with same manifest', async () => {
    const manifest = new Manifest();
    const state = new State({
        uri: 'http://does.not.mather.com',
    });
    state.manifest = { name: 'component' };

    await manifest.resolve(state);

    expect(state.manifest.name).toBe('component');
});

test('resolver.manifest() - remote has no cache header - should set state.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(state);

    expect(state.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: public, max-age=10" header - should set state.maxAge to header value', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'public, max-age=10',
    };

    const manifest = new Manifest();
    const state = new State({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(state);

    // See NOTE I for details
    expect(state.maxAge < 10000 && state.maxAge > 9000).toBeTruthy();

    await server.close();
});

test('resolver.manifest() - remote has "cache-control: no-cache" header - should set state.maxAge to default', async () => {
    const server = new Faker();
    const service = await server.listen();
    server.headersManifest = {
        'cache-control': 'no-cache',
    };

    const manifest = new Manifest();
    const state = new State({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(state);

    expect(state.maxAge).toBe(40000);

    await server.close();
});

test('resolver.manifest() - remote has "expires" header - should set state.maxAge to header value', async () => {
    const clock = lolex.install();

    const server = new Faker();
    const service = await server.listen();

    // Set expire header time to two hours into future
    server.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    const manifest = new Manifest();
    const state = new State({
        uri: service.options.uri,
        maxAge: 40000,
    });

    await manifest.resolve(state);

    expect(state.maxAge).toBe(1000 * 60 * 60 * 2); // 2 hours

    await server.close();
    clock.uninstall();
});

test('resolver.manifest() - one remote has "expires" header second none - should set and timout one and use default for second', async () => {
    const clock = lolex.install();

    const serverA = new Faker({
        name: 'aa',
    });
    const serverB = new Faker({
        name: 'bb',
    });

    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    // Set expires by http headers two hours into future
    serverA.headersManifest = {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 2).toUTCString(),
    };

    // Set default expires four hours into future
    const client = new Client({ maxAge: 1000 * 60 * 60 * 4 });
    client.register(serviceA.options);
    client.register(serviceB.options);

    await client.refreshManifests();

    expect(serverA.metrics.manifest).toEqual(1);
    expect(serverB.metrics.manifest).toEqual(1);

    // Tick clock three hours into future
    clock.tick(1000 * 60 * 60 * 3);

    await client.refreshManifests();

    // Cache for server A should now have timed out
    expect(serverA.metrics.manifest).toEqual(2);
    expect(serverB.metrics.manifest).toEqual(1);

    await serverA.close();
    await serverB.close();
    clock.uninstall();
});

test('resolver.manifest() - throwable:true - remote can not be resolved - should throw', async () => {
    expect.hasAssertions();

    const manifest = new Manifest();
    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: true,
    });

    try {
        await manifest.resolve(state);
    } catch (error) {
        expect(error.message).toMatch(/Error reading manifest/);
    }
});

test('resolver.manifest() - throwable:true - remote responds with http 500 - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.error,
        throwable: true,
    });

    try {
        await manifest.resolve(state);
    } catch (error) {
        expect(error.message).toMatch(/Could not read manifest/);
    }

    await server.close();
});

test('resolver.manifest() - throwable:true - manifest is not valid - should throw', async () => {
    expect.hasAssertions();

    const server = new Faker();
    server.manifestBody = { __id: 'component' };
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
        throwable: true,
    });

    try {
        await manifest.resolve(state);
    } catch (error) {
        expect(error.message).toMatch(/is required/);
    }

    await server.close();
});

test('resolver.manifest() - throwable:false - remote can not be resolved - "state.manifest" should be {_fallback: ""}', async () => {
    const manifest = new Manifest();
    const state = new State({
        uri: 'http://does.not.exist.finn.no/manifest.json',
        throwable: false,
    });

    await manifest.resolve(state);
    expect(state.manifest).toEqual({ _fallback: '' });
});

test('resolver.manifest() - throwable:false - remote responds with http 500 - "state.manifest" should be {_fallback: ""}', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.error,
        throwable: false,
    });

    await manifest.resolve(state);
    expect(state.manifest).toEqual({ _fallback: '' });

    await server.close();
});

test('resolver.manifest() - throwable:false - manifest is not valid - "state.manifest" should be {_fallback: ""}', async () => {
    const server = new Faker();
    server.manifestBody = { __id: 'component' };
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
        throwable: false,
    });

    await manifest.resolve(state);
    expect(state.manifest).toEqual({ _fallback: '' });

    await server.close();
});

test('resolver.manifest() - "content" in manifest is relative - "state.manifest.content" should be absolute', async () => {
    const server = new Faker();
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
    });

    await manifest.resolve(state);
    expect(state.manifest.content).toEqual(service.content);

    await server.close();
});

test('resolver.manifest() - "content" in manifest is absolute - "state.manifest.content" should be absolute', async () => {
    const server = new Faker();
    server.content = 'http://does.not.mather.com';
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
    });

    await manifest.resolve(state);
    expect(state.manifest.content).toEqual('http://does.not.mather.com');

    await server.close();
});

test('resolver.manifest() - "fallback" in manifest is relative - "state.manifest.fallback" should be absolute', async () => {
    const server = new Faker();
    server.fallback = '/fallback.html';
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
    });

    await manifest.resolve(state);
    expect(state.manifest.fallback).toEqual(`${service.address}/fallback.html`);

    await server.close();
});

test('resolver.manifest() - "fallback" in manifest is absolute - "state.manifest.fallback" should be absolute', async () => {
    const server = new Faker();
    server.fallback = 'http://does.not.mather.com';
    const service = await server.listen();

    const manifest = new Manifest();
    const state = new State({
        uri: service.manifest,
    });

    await manifest.resolve(state);
    expect(state.manifest.fallback).toEqual('http://does.not.mather.com');

    await server.close();
});