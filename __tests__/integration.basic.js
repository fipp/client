'use strict';

const Client = require('../');
const Faker = require('../test/faker');

test('integration basic - ', async () => {
    const serverA = new Faker({ name: 'aa' });
    const serverB = new Faker({ name: 'bb' });
    const serviceA = await serverA.listen();
    const serviceB = await serverB.listen();

    const client = new Client();
    const a = client.register(serviceA.options);
    const b = client.register(serviceB.options);

    expect(serverA.contentBody).toBe(await a.fetch());
    expect(serverB.contentBody).toBe(await b.fetch());

    await serverA.close();
    await serverB.close();
});