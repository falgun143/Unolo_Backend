import { EventEmitter } from "events";

export type Payload = {
  scheduled_time: string;
  count: number;
  visits: Visit[];
};

export type Visit = {
  id : Number;
  store_id: string;
  image_url: string[];
  visit_time: string;
}

export type Context = {
  vars: {
    payload: Payload | Record<string, unknown>;
  };
};

export type DoneCallback = () => void;

export type LoadTestFunction = (
  context: Context,
  events: EventEmitter,
  done: DoneCallback
) => void;
