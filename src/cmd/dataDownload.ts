import axios, { AxiosResponse } from 'axios';
import ProgressBar from 'progress';
import fs from 'fs';
import yargs from 'yargs';
import config from '../config';

async function run() {
  const { argv } = yargs
    .usage(
      'Usage: $0 --out=[output file, default: ./data/products/products.csv.gz ]'
    )
    .options({
      out: { type: 'string', default: './data/products/products.csv.gz' },
    });

  let latestResp: AxiosResponse<{ downloadUrl: string }>;

  try {
    latestResp = await axios.get(
      `${config.infracostPricingApiEndpoint}/data-download/latest`,
      {
        headers: {
          'X-Api-Key': config.infracostAPIKey,
        },
      }
    );
  } catch (e) {
    if (e.response?.status === 403) {
      config.logger.error(
        'You do not have permission to download data. Please set a INFRACOST_API_KEY.'
      );
    } else {
      config.logger.error(`There was an error downloading data: ${e.message}`);
    }
    process.exit(1);
  }

  const { downloadUrl } = latestResp.data;
  config.logger.debug(`Downloading dump from ${downloadUrl}`);

  const writer = fs.createWriteStream(argv.out);
  await axios({
    method: 'get',
    url: downloadUrl,
    responseType: 'stream',
  }).then((resp) => {
    return new Promise((resolve, reject) => {
      const progressBar = new ProgressBar(
        '-> downloading [:bar] :percent (:etas remaining)',
        {
          width: 40,
          complete: '=',
          incomplete: ' ',
          renderThrottle: 500,
          total: parseInt(resp.headers['content-length'], 10),
        }
      );

      resp.data.on('data', (chunk: { length: number }) =>
        progressBar.tick(chunk.length)
      );

      resp.data.pipe(writer);

      let error: Error | null = null;
      writer.on('error', (err) => {
        error = err;
        writer.close();
        reject(err);
      });

      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
      });
    });
  });
}

config.logger.info('Starting: downloading DB data');
run()
  .then(() => {
    config.logger.info('Completed: downloading DB data');
    process.exit(0);
  })
  .catch((err) => {
    config.logger.error(err);
    process.exit(1);
  });
