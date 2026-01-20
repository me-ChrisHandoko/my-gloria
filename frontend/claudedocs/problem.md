Listening and serving HTTP on :8080
[GIN] 2026/01/19 - 15:05:01 | 401 | 0s | ::1 | GET "/api/v1/permissions?page=1&page_size=20&sort_by=code&sort_order=asc"
[GIN] 2026/01/19 - 15:05:02 | 204 | 0s | ::1 | OPTIONS "/api/v1/permissions?page=1&page_size=20&sort_by=code&sort_order=asc"
[GIN] 2026/01/19 - 15:05:02 | 401 | 0s | ::1 | GET "/api/v1/permissions?page=1&page_size=20&sort_by=code&sort_order=asc"
[GIN] 2026/01/19 - 15:05:03 | 204 | 0s | ::1 | OPTIONS "/api/v1/auth/refresh"

2026/01/19 15:05:03 C:/Users/Christian/go/my-gloria/backend/internal/handlers/auth.go:334
[0.509ms] [rows:1] SELECT \* FROM "public"."users" WHERE "users"."id" = '9cfbb818-a961-41be-99c1-6241496e8f08'

2026/01/19 15:05:03 C:/Users/Christian/go/my-gloria/backend/internal/handlers/auth.go:334
[2.386ms] [rows:52] SELECT \* FROM "public"."refresh_tokens" WHERE expires_at > '2026-01-19 15:05:03.01'

2026/01/19 15:05:03 C:/Users/Christian/go/my-gloria/backend/internal/handlers/auth.go:387
[0.000ms] [rows:0] INSERT INTO "public"."users" ("id","email","username","password_hash","email_verified","email_verification_token","password_reset_token","password_reset_expires_at","last_password_change","failed_login_attempts","locked_until","is_active","last_active","preferences","created_at","updated_at","created_by") VALUES ('9cfbb818-a961-41be-99c1-6241496e8f08','christian_handoko@gloriaschool.org','christian_handoko','$argon2id$v=19$m=65536,t=1,p=4$BAO4qMH+5UtQY/pkn4VDSg$SNUCx5aUosrU1XUk9i/gOm+chi15Kv/QjFS0cQQbzRk',false,NULL,NULL,NULL,NULL,1,NULL,true,'2026-01-19 14:47:04.458',NULL,'2026-01-15 08:17:08.633','2026-01-19 14:57:08.666',NULL) ON CONFLICT DO NOTHING

2026/01/19 15:05:03 C:/Users/Christian/go/my-gloria/backend/internal/handlers/auth.go:387
[0.995ms] [rows:1] UPDATE "public"."refresh_tokens" SET "user_id"='9cfbb818-a961-41be-99c1-6241496e8f08',"token_hash"='$argon2id$v=19$m=65536,t=1,p=4$yiWrW9xudVwzvDDa/eAxRA$l+McWTGWGgGQlIGEtPrmWqX/OjBj+AF4hC07calCI/Q',"expires_at"='2026-01-26 14:47:04.49',"created_at"='2026-01-19 14:47:04.49',"last_used_at"='2026-01-19 15:05:03.982',"revoked_at"='2026-01-19 15:05:03.982',"user_agent"='Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',"ip_address"='::1',"device_info"=NULL WHERE "id" = '74b2715e-ec01-4060-bcf2-01a5ce445bda'

2026/01/19 15:05:04 C:/Users/Christian/go/my-gloria/backend/internal/handlers/auth.go:421
[0.995ms] [rows:1] INSERT INTO "public"."refresh_tokens" ("id","user_id","token_hash","expires_at","created_at","last_used_at","revoked_at","user_agent","ip_address","device_info") VALUES ('5a2606d3-297e-4f56-80ec-e4d4262c1357','9cfbb818-a961-41be-99c1-6241496e8f08','$argon2id$v=19$m=65536,t=1,p=4$INMKlm3mR5AY824JitVQKA$BPiVV+f1IQShpX/ADwInQK2Cti6Rc/uwG6e6suiWyYI','2026-01-26 15:05:04','2026-01-19 15:05:04',NULL,NULL,'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36','::1',NULL)
2026/01/19 15:05:04 [TOKEN_ROTATION] User: christian_handoko@gloriaschool.org | Old Token: 74b2715e-ec01-4060-bcf2-01a5ce445bda | New Token: 5a2606d3-297e-4f56-80ec-e4d4262c1357 | IP: ::1
[GIN] 2026/01/19 - 15:05:04 | 200 | 993.1662ms | ::1 | POST "/api/v1/auth/refresh"

2026/01/19 15:05:04 C:/Users/Christian/go/my-gloria/backend/internal/middleware/auth-hybrid.go:51
[0.000ms] [rows:1] SELECT \* FROM "public"."users" WHERE id = '9cfbb818-a961-41be-99c1-6241496e8f08' ORDER BY "users"."id" LIMIT 1

2026/01/19 15:05:04 C:/Users/Christian/go/my-gloria/backend/internal/services/permission_service.go:110
[0.000ms] [rows:1] SELECT count(\*) FROM "public"."permissions"

2026/01/19 15:05:04 C:/Users/Christian/go/my-gloria/backend/internal/services/permission_service.go:138
[0.998ms] [rows:0] SELECT \* FROM "public"."permissions" ORDER BY code ASC LIMIT 20
[GIN] 2026/01/19 - 15:05:04 | 200 | 1.9946ms | ::1 | GET "/api/v1/permissions?page=1&page_size=20&sort_by=code&sort_order=asc"
