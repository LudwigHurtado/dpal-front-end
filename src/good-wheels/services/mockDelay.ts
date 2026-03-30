export async function mockDelay(ms = 350): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

