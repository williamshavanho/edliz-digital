declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    EDLIZ_PUBLISHER_EMAIL?: string;
  }
}
