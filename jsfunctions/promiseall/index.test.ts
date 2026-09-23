import assert from 'node:assert/strict';
import test from 'node:test';
import suite from 'node:test';
import promiseAll from './index.js';

suite('promiseAll', () => {
    test('returns promise', () => {
        const p = promiseAll([]);
        assert(p instanceof Promise, true);
    });

    test('empty input array', async () => {
        const res = await promiseAll([]);
        assert(res, []);
    });

    suite('one promise', () => {
        suite('resolve', () => {
            test('value', async () => {
                const p0 = 2;
                const res = await promiseAll([p0]);
                assert(res, [2]);
            });

            test('instant', async () => {
                const p0 = Promise.resolve(2);

                const res = await promiseAll([p0]);
                assert(res, [2]);
            });

            test('delayed', async () => {
                const p0 = new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(2);
                    }, 10);
                });

                const res = await promiseAll([p0]);
                assert(res, [2]);
            });
        });

        suite('reject', () => {
            test('instant', async () => {

                const p0 = Promise.reject(2);

                const rejects = await promiseAll([p0]);
                console.log("hhe")
                console.log(rejects);
                // assert(rejects, 2);
            });

            // test('delayed', async () => {

            //     const p0 = new Promise((_, reject) => {
            //         setTimeout(() => {
            //             reject(2);
            //         }, 10);
            //     });

            //     await assert(promiseAll([p0])).rejects.toBe(2);
            // });
        });
    });

    // suite('multiple promises', () => {
    //     suite('all resolve', () => {
    //         test('instant', async () => {

    //             const p0 = Promise.resolve(2);
    //             const p1 = Promise.resolve(3);

    //             const res = await promiseAll([p0, p1]);
    //             assert(res).toEqual([2, 3]);
    //         });

    //         test('delayed', async () => {

    //             const p0 = Promise.resolve(2);
    //             const p1 = new Promise((resolve) => {
    //                 setTimeout(() => {
    //                     resolve(3);
    //                 }, 10);
    //             });

    //             const res = await promiseAll([p0, p1]);
    //             assert(res).toEqual([2, 3]);
    //         });

    //         test('mixture', async () => {

    //             const p0 = new Promise((resolve) => {
    //                 setTimeout(() => {
    //                     resolve(2);
    //                 }, 10);
    //             });
    //             const p1 = Promise.resolve(3);
    //             const p2 = 4;

    //             const res = await promiseAll([p0, p1, p2]);
    //             assert(res).toEqual([2, 3, 4]);
    //         });

    //         test('many delayed', async () => {

    //             const p0 = new Promise((resolve) => {
    //                 setTimeout(() => {
    //                     resolve(1);
    //                 }, 200);
    //             });
    //             const p1 = new Promise((resolve) => {
    //                 setTimeout(() => {
    //                     resolve(2);
    //                 }, 100);
    //             });
    //             const p2 = new Promise((resolve) => {
    //                 setTimeout(() => {
    //                     resolve(3);
    //                 }, 10);
    //             });

    //             const res = await promiseAll([p0, p1, p2]);
    //             assert(res).toEqual([1, 2, 3]);
    //         });
    //     });

    //     suite('all reject', () => {
    //         test('instant', async () => {

    //             const p0 = Promise.reject(2);
    //             const p1 = Promise.reject(3);

    //             await assert(promiseAll([p0, p1])).rejects.toBe(2);
    //         });

    //         test('delayed', async () => {

    //             const p0 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(3);
    //                 }, 1);
    //             });
    //             const p1 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(2);
    //                 }, 10);
    //             });

    //             await assert(promiseAll([p0, p1])).rejects.toBe(3);
    //         });

    //         test('mixture', async () => {

    //             const p0 = Promise.reject(42);
    //             const p1 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(2);
    //                 }, 10);
    //             });

    //             await assert(promiseAll([p0, p1])).rejects.toBe(42);
    //         });
    //     });

    //     suite('mix of resolve and reject', () => {
    //         test('instant resolve delayed reject', async () => {

    //             const p0 = Promise.resolve(42);
    //             const p1 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(2);
    //                 }, 10);
    //             });

    //             await assert(promiseAll([p0, p1])).rejects.toBe(2);
    //         });

    //         test('instant resolve instant reject', async () => {

    //             const p0 = Promise.resolve(42);
    //             const p1 = Promise.reject(2);

    //             await assert(promiseAll([p0, p1])).rejects.toBe(2);
    //         });

    //         test('instant rejects', async () => {

    //             const p0 = Promise.reject(42);
    //             const p1 = Promise.reject(43);

    //             await assert(promiseAll([p0, p1])).rejects.toBe(42);
    //         });

    //         test('many promises', async () => {

    //             const p0 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(1);
    //                 }, 200);
    //             });
    //             const p1 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(2);
    //                 }, 100);
    //             });
    //             const p2 = new Promise((_, reject) => {
    //                 setTimeout(() => {
    //                     reject(3);
    //                 }, 10);
    //             });

    //             await assert(promiseAll([p0, p1, p2])).rejects.toBe(3);
    //         });
    //     });
    // });
});