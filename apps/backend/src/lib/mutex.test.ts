import { describe, expect, it } from 'vitest';
import { KeyedMutex } from './mutex';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('KeyedMutex', () => {
  it('führt Aufgaben mit gleichem Schlüssel nacheinander aus', async () => {
    const mutex = new KeyedMutex();
    const log: string[] = [];
    const task = (name: string, ms: number) => async () => {
      log.push(`${name}:start`);
      await delay(ms);
      log.push(`${name}:end`);
    };
    await Promise.all([mutex.run('a', task('1', 20)), mutex.run('a', task('2', 1))]);
    expect(log).toEqual(['1:start', '1:end', '2:start', '2:end']);
  });

  it('lässt andere Schlüssel parallel laufen und setzt nach Fehlern fort', async () => {
    const mutex = new KeyedMutex();
    const log: string[] = [];
    const failing = mutex.run('a', async () => {
      await delay(10);
      throw new Error('kaputt');
    });
    const other = mutex.run('b', async () => log.push('b'));
    const next = mutex.run('a', async () => log.push('a'));
    await expect(failing).rejects.toThrow('kaputt');
    await Promise.all([other, next]);
    expect(log).toEqual(['b', 'a']);
  });
});
