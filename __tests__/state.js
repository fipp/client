'use strict';

const isStream = require('is-stream');
const Cache = require('ttl-mem-cache');
const State = require('../lib/state');

const REGISTRY = new Cache();
const REQ_OPTIONS = {
    pathname: 'a',
    query: { b: 'c' },
};
const RESOURCE_OPTIONS = {
    uri: 'http://example.org',
};

/**
 * Constructor
 */

test('State() - set "registry" - should be persisted on "this.registry"', () => {
    const state = new State(REGISTRY);
    expect(state.registry).not.toBeUndefined();
});

test('State() - set "uri" - should be persisted on "this.uri"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    expect(state.uri).toBe(RESOURCE_OPTIONS.uri);
});

test('State() - set "reqOptions" - should be persisted on "this.reqOptions"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.reqOptions.pathname).toBe('a');
    expect(state.reqOptions.query.b).toBe('c');
});

test('State() - "this.manifest" should be undefined', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.manifest).toBeUndefined();
});

test('State() - "this.content" should be empty String', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.content).toBe('');
});

test('State() - No value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "true" value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS, true);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "false" value for streamThrough - "this.stream" should contain a Writable stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS, false);
    expect(isStream.writable(state.stream)).toBe(true);
});