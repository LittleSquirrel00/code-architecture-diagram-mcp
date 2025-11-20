/**
 * Intra-file implementation (should be skipped)
 */
interface ILocal {
  process(): void
}

export class LocalService implements ILocal {
  process(): void {
    console.log('Processing locally')
  }
}
