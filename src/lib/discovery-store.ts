import { getPool } from "./db";
import { discoveryInput } from "./discovery";

export async function storeDiscoveryEvent(
  b: ReturnType<typeof discoveryInput>,
) {
  const query = {
    text: `INSERT INTO directory_discovery_events(id,session_id,event,page,service,result_bucket,listing_id,target,campaign_source,acquisition_channel,device_category,journey_id,step,duration_ms,metric,metric_value,metric_sequence)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT(id) DO UPDATE SET metric_value=EXCLUDED.metric_value,metric_sequence=EXCLUDED.metric_sequence
      WHERE directory_discovery_events.event='web_vital' AND EXCLUDED.event='web_vital'
        AND directory_discovery_events.session_id=EXCLUDED.session_id AND directory_discovery_events.metric=EXCLUDED.metric
        AND EXCLUDED.metric_sequence>directory_discovery_events.metric_sequence`,
    values: [
      b.id,
      b.session_id,
      b.event,
      b.page,
      b.service,
      b.result_bucket,
      b.listing_id,
      b.target,
      b.campaign_source,
      b.acquisition_channel,
      b.device_category,
      b.journey_id,
      b.step,
      b.duration_ms,
      b.metric,
      b.metric_value,
      b.metric_sequence,
    ],
    query_timeout: 2000,
  };
  return getPool().query(query);
}
