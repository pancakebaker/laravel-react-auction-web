import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import YAML from 'yaml';

const documentPath = fileURLToPath(
    new globalThis.URL('../tests/contracts/bidding-api.v1.yaml', import.meta.url),
);
const document = YAML.parse(await readFile(documentPath, 'utf8'));

function operation(path, method) {
    const result = document.paths?.[path]?.[method];
    assert.ok(result, `Missing ${method.toUpperCase()} ${path} in canonical OpenAPI.`);
    return result;
}

function schema(name) {
    const result = document.components?.schemas?.[name];
    assert.ok(result, `Missing ${name} schema in canonical OpenAPI.`);
    return result;
}

void test('Laravel BFF auction client paths and methods are documented', () => {
    assert.ok(operation('/api/auctions/', 'get'));
    assert.ok(operation('/api/auctions/{id}', 'get'));
    assert.ok(operation('/api/auctions/{id}/bids', 'get'));
    assert.ok(operation('/api/auctions/{id}/bids', 'post'));
    assert.ok(operation('/api/auctions/{id}/buy-now', 'post'));
    assert.ok(operation('/api/auctions', 'post'));
    assert.ok(operation('/api/auctions/{id}', 'put'));
    assert.ok(operation('/api/auctions/{id}', 'delete'));
    assert.ok(operation('/api/auctions/{id}/cancel', 'post'));
});

void test('Laravel BFF request and response expectations are documented', () => {
    const bid = operation('/api/auctions/{id}/bids', 'post');
    const buyNow = operation('/api/auctions/{id}/buy-now', 'post');
    const cancel = operation('/api/auctions/{id}/cancel', 'post');

    assert.deepEqual(bid.requestBody.content['application/json'].schema, {
        $ref: '#/components/schemas/PlaceBidRequest',
    });
    assert.deepEqual(buyNow.requestBody.content['application/json'].schema, {
        $ref: '#/components/schemas/BuyNowRequest',
    });
    assert.deepEqual(cancel.requestBody.content['application/json'].schema, {
        $ref: '#/components/schemas/CancelAuctionRequest',
    });
    assert.equal(schema('PlaceBidRequest').required[0], 'amount');
    assert.equal(schema('BuyNowRequest').type, 'object');
    assert.equal(schema('CancelAuctionRequest').required[0], 'version');
    assert.ok(bid.responses['201']);
    assert.ok(buyNow.responses['201']);
    assert.ok(cancel.responses['200']);
});

void test('Bidding error status expectations are represented', () => {
    for (const [path, method] of [
        ['/api/auctions/{id}/bids', 'post'],
        ['/api/auctions/{id}/buy-now', 'post'],
        ['/api/auctions/{id}/cancel', 'post'],
    ]) {
        const responses = operation(path, method).responses;
        for (const status of ['401', '403', '404', '409']) {
            assert.ok(responses[status], `Missing ${status} for ${method.toUpperCase()} ${path}.`);
        }
    }
});
