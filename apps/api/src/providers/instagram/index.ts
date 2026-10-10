import { config } from '../../config';
import { InstagramProvider } from './types';
import { MockProvider } from './mock.provider';
import { ProductionProvider } from './production.provider';

export function getInstagramProvider(): InstagramProvider {
  if (config.INSTAGRAM_PROVIDER === 'mock') {
    return new MockProvider();
  }
  return new ProductionProvider();
}
