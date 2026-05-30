import { Injectable } from '@nestjs/common';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { EnvService } from '../../config/env.service';

type EmbedResult = {
  embeddings: number[][];
};

@Injectable()
export class VertexEmbeddingsService {
  private readonly client: PredictionServiceClient;
  private readonly projectId: string;
  private readonly location: string;
  private readonly model: string;

  constructor(private readonly env: EnvService) {
    this.projectId = this.env.env.GCP_PROJECT_ID;
    this.location = this.env.env.GCP_LOCATION;
    this.model = this.env.env.VERTEX_EMBEDDING_MODEL;

    this.client = new PredictionServiceClient({
      apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
    });
  }

  async embedBatch(texts: string[]): Promise<EmbedResult> {
    if (!texts.length) return { embeddings: [] };

    const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}`;

    // The aiplatform predict() API expects protobuf Value objects, not plain
    // JS objects — convert via the SDK helpers (and decode the response too).
    const instances = texts.map((content) => helpers.toValue({ content }));
    const parameters = helpers.toValue({});

    const [response] = (await this.client.predict({
      endpoint,
      instances: instances as unknown as object[],
      parameters: parameters as unknown as object,
    })) as unknown as [{ predictions?: unknown[] }];

    const predictions = response.predictions ?? [];
    const embeddings = predictions.map((p) => {
      const decoded = helpers.fromValue(
        p as Parameters<typeof helpers.fromValue>[0],
      ) as { embeddings?: { values?: number[] } };
      const values = decoded?.embeddings?.values;
      if (!Array.isArray(values)) {
        throw new Error('Unexpected embedding response shape from Vertex AI');
      }
      return values;
    });

    return { embeddings };
  }
}
