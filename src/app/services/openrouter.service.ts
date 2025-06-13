import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Model {
	id: string;
	name: string;
}

export interface ModelsResponse {
	data: Model[];
}

@Injectable({
	providedIn: "root",
})
export class OpenRouterService {
	private readonly API_URL = "https://openrouter.ai/api/v1";

	constructor(private http: HttpClient) {}

	getModels(): Observable<ModelsResponse> {
		return this.http.get<ModelsResponse>(`${this.API_URL}/models`);
	}
}
