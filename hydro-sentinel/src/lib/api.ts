import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const buildApiRoot = (baseUrl: string, apiPrefix: string): string => {
  const normalizedPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const trimmedBase = baseUrl.trim();

  if (!trimmedBase) {
    return normalizedPrefix;
  }

  return `${trimmedBase.replace(/\/+$/, '')}${normalizedPrefix}`;
};

const apiRoot = buildApiRoot(
  import.meta.env.VITE_API_BASE_URL || '',
  import.meta.env.VITE_API_PREFIX || '/api/v1'
);

// Create axios instance (not exported yet)
const axiosInstance = axios.create({
  baseURL: apiRoot,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Add helper methods and export as 'api'
export const api = Object.assign(axiosInstance, {
  getHealth: () => axiosInstance.get('/health').then(res => ({ data: res.data, fromApi: true })),
  getVariables: () => axiosInstance.get('/variables').then(res => ({ ...res, fromApi: true })),
  getStations: (params: any) => axiosInstance.get('/stations', { params }),

  getRuns: (params: any) => axiosInstance.get('/measurements/runs', { params }),
  getBasins: (params?: any) => axiosInstance.get('/basins', { params }),
  getDams: () => axiosInstance.get('/stations', { params: { type: 'barrage' } }), 
  getAlerts: (params: any) => axiosInstance.get('/alerts', { params }), 
  getCompare: (params: any) => axiosInstance.get('/measurements/compare', { params }),
  getKpis: (params: any) => axiosInstance.get('/map/points-kpi', { params }),
  getIngestions: () => axiosInstance.get('/ingestions'),
  getThematicMapCatalog: (
    mapType: 'flood' | 'snow' | 'precip',
    params?: { event?: string; date_from?: string; date_to?: string }
  ) => axiosInstance.get(`/thematic-maps/${mapType}`, { params }).then((res) => res.data),
  getThematicMapHistory: (
    mapType: 'flood' | 'snow' | 'precip',
    params?: { event?: string; date_from?: string; date_to?: string }
  ) => axiosInstance.get(`/thematic-maps/${mapType}/history`, { params }).then((res) => res.data),
  getThematicMapProduct: (mapType: 'flood' | 'snow' | 'precip', productId: string) =>
    axiosInstance.get(`/thematic-maps/${mapType}/products/${productId}`).then((res) => res.data),
  
  // Ingestion API (Integrated)
  uploadAnalysis: (formData: FormData) => axiosInstance.post('/ingest/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadExecute: (formData: FormData) => axiosInstance.post('/ingest/execute', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getIngestionsHistory: () => axiosInstance.get('/ingest/history').then(res => res.data),

  // Admin API - Entity CRUD
  getEntities: (type: string) => axiosInstance.get(`/admin/entities/${type}`).then(res => res.data),
  createEntity: (type: string, data: any) => axiosInstance.post(`/admin/entities/${type}`, data),
  updateEntity: (type: string, id: string, data: any) => axiosInstance.put(`/admin/entities/${type}/${id}`, data),
  deleteEntity: (type: string, id: string) => {
    console.log('Deleting entity:', type, id);
    return axiosInstance.delete(`/admin/entities/${type}/${id}`);
  },
  
  // Admin API - SHP
  uploadShp: (formData: FormData) => axiosInstance.post('/admin/shp/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Time Series Management API
  getSources: () => axiosInstance.get('/admin/timeseries/sources').then(res => res.data),
  getTimeSeriesStations: (variableCode: string, allStations: boolean = false) => 
    axiosInstance.get(`/admin/timeseries/${variableCode}?all_stations=${allStations}`).then(res => res.data),
  getTimeSeriesData: (variableCode: string, stationId: string, startDate?: string, endDate?: string) => 
    axiosInstance.get(`/admin/timeseries/${variableCode}/${stationId}`, { 
      params: { start_date: startDate, end_date: endDate } 
    }).then(res => res.data),
  addTimeSeriesPoint: (variableCode: string, stationId: string, data: { timestamp: string, value: number, quality_flag?: string }) =>
    axiosInstance.post(`/admin/timeseries/${variableCode}/${stationId}`, data),
  deleteTimeSeriesPoint: (variableCode: string, stationId: string, timestamp: string) =>
    axiosInstance.delete(`/admin/timeseries/${variableCode}/${stationId}/${encodeURIComponent(timestamp)}`),
  deleteTimeSeriesAll: (variableCode: string, stationId: string) =>
    axiosInstance.delete(`/admin/timeseries/${variableCode}/${stationId}`),
  uploadTimeSeries: (formData: FormData) => axiosInstance.post('/admin/timeseries/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadSpatialImport: (formData: FormData) => axiosInstance.post('/import/spatial', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  analyzeTimeSeries: (formData: FormData) => axiosInstance.post('/admin/timeseries/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Smart Template Downloads
  downloadTemplateSimple: (stationId?: string, variableCode?: string, sourceCode?: string) => {
    const params = new URLSearchParams();
    if (stationId) params.append('station_id', stationId);
    if (variableCode) params.append('variable_code', variableCode);
    if (sourceCode) params.append('source_code', sourceCode);
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/simple${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
  downloadTemplateSimpleMultiSource: (stationId?: string, variableCode?: string, sourceCodes?: string[]) => {
    const params = new URLSearchParams();
    if (stationId) params.append('station_id', stationId);
    if (variableCode) params.append('variable_code', variableCode);
    if (sourceCodes?.length) params.append('source_codes', sourceCodes.join(','));
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/simple-multi-source${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
  downloadTemplateMultiVariable: (stationId?: string, sourceCode?: string) => {
    const params = new URLSearchParams();
    if (stationId) params.append('station_id', stationId);
    if (sourceCode) params.append('source_code', sourceCode);
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/multi-variable${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
  downloadTemplateMultiVariableMultiSource: (stationId?: string, sourceCodes?: string[]) => {
    const params = new URLSearchParams();
    if (stationId) params.append('station_id', stationId);
    if (sourceCodes?.length) params.append('source_codes', sourceCodes.join(','));
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/multi-variable-multi-source${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
  downloadTemplateMultiStation: (variableCode?: string, sourceCode?: string) => {
    const params = new URLSearchParams();
    if (variableCode) params.append('variable_code', variableCode);
    if (sourceCode) params.append('source_code', sourceCode);
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/multi-station${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
  downloadTemplateMultiBasin: (variableCode?: string, sourceCode?: string, basinShape?: string) => {
    const params = new URLSearchParams();
    if (variableCode) params.append('variable_code', variableCode);
    if (sourceCode) params.append('source_code', sourceCode);
    if (basinShape) params.append('basin_shape', basinShape);
    const query = params.toString();
    return axiosInstance.get(`/admin/templates/multi-bassin${query ? `?${query}` : ''}`, {
      responseType: 'blob',
      timeout: 15000,
    });
  },
});
