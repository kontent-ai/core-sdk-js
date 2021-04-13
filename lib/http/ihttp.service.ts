import {
  IResponse,
  IHttpDeleteQueryCall,
  IHttpGetQueryCall,
  IHttpPostQueryCall,
  IHttpPutQueryCall,
  IHttpQueryOptions,
  IHttpPatchQueryCall,
} from './http.models';

export interface IHttpService {
  getAsync<TRawData>(call: IHttpGetQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>>;
  postAsync<TRawData>(call: IHttpPostQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>>;
  putAsync<TRawData>(call: IHttpPutQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>>;
  patchAsync<TRawData>(call: IHttpPatchQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>>;
  deleteAsync<TRawData>(call: IHttpDeleteQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>>;
}
