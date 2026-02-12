using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Server.Models;
using Supabase;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/gameranking")]
    public class GameRankingController : ControllerBase
    {
        private readonly Client _supabaseClient;
        private readonly IConfiguration _configuration;

        // HMAC 서명을 위한 비밀키 (실제 운영 시 appsettings.json 등으로 관리 권장)
        // 여기서는 예시로 하드코딩하거나 Config에서 가져오도록 함
        private string GetSecretKey() =>
            _configuration["Game:SecretKey"]
            ?? "Foodwiki_Super_Secret_Key_For_Ranking_Security_2026";

        public GameRankingController(Client supabaseClient, IConfiguration configuration)
        {
            _supabaseClient = supabaseClient;
            _configuration = configuration;
        }

        // TOP 10 랭킹 조회
        [HttpGet]
        public async Task<IActionResult> GetRankings()
        {
            try
            {
                var result = await _supabaseClient
                    .From<GameRanking>()
                    .Order("score", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Limit(10)
                    .Get();

                // DTO 변환
                var response = result.Models.Select(m => new GameRankingResponse
                {
                    Id = m.Id,
                    Nickname = m.Nickname,
                    Score = m.Score,
                    CreatedAt = m.CreatedAt,
                });

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.ToString() });
            }
        }

        // ★ 게임 시작 (토큰 발급)
        [HttpPost("start")]
        public IActionResult StartGame()
        {
            try
            {
                var startTime = DateTime.UtcNow;
                var payload = new
                {
                    startedAt = startTime.Ticks,
                    nonce = Guid.NewGuid().ToString(), // 재사용 방지용 난수
                };

                // JSON 직렬화 후 서명
                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var token = ComputeHmacSha256(json, GetSecretKey());

                // 클라이언트에 줄 데이터: payload(평문) + signature
                // 편의상 Base64로 인코딩해서 합쳐서 줌
                var plainBytes = System.Text.Encoding.UTF8.GetBytes(json);
                var base64Payload = Convert.ToBase64String(plainBytes);

                return Ok(new { token = $"{base64Payload}.{token}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // 점수 등록 (보안 강화)
        [HttpPost]
        public async Task<IActionResult> AddRanking([FromBody] GameRankingRequest request)
        {
            try
            {
                // 1. 토큰 유효성 검사
                if (string.IsNullOrEmpty(request.Token))
                {
                    return BadRequest("Ranking Token is required.");
                }

                var parts = request.Token.Split('.');
                if (parts.Length != 2)
                {
                    return BadRequest("Invalid Token format.");
                }

                var base64Payload = parts[0];
                var signature = parts[1];

                // 2. 서명 검증
                var jsonBytes = Convert.FromBase64String(base64Payload);
                var json = System.Text.Encoding.UTF8.GetString(jsonBytes);
                var computedSignature = ComputeHmacSha256(json, GetSecretKey());

                if (signature != computedSignature)
                {
                    return StatusCode(403, "Invalid Token Signature. Cheating detected.");
                }

                // 3. 시간 검증 (Payload 파싱)
                var payload = System.Text.Json.JsonSerializer.Deserialize<GameStartPayload>(json);
                if (payload == null)
                {
                    return BadRequest("Invalid Token Payload.");
                }

                var startTime = new DateTime(payload.startedAt, DateTimeKind.Utc);
                var now = DateTime.UtcNow;
                var maxPossibleScore = (now - startTime).TotalSeconds + 5.0; // 5초 정도의 네트워크/로딩 여유 허용

                // ★ 핵심: 서버 시간 기준 생존 가능한 시간보다 제출된 점수가 크면 조작으로 간주
                if (request.Score > maxPossibleScore)
                {
                    return StatusCode(
                        403,
                        $"Score manipulation detected. Max possible: {maxPossibleScore:F2}, Submitted: {request.Score:F2}"
                    );
                }

                // [기존 로직]
                var url = _configuration["Supabase:Url"];
                var key = _configuration["Supabase:Key"];

                if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
                {
                    return StatusCode(500, new { message = "Server Configuration Error" });
                }

                if (string.IsNullOrWhiteSpace(request.Nickname) || request.Score <= 0)
                {
                    return BadRequest("Invalid data.");
                }

                string finalNickname =
                    request.Nickname.Length > 10
                        ? request.Nickname.Substring(0, 10)
                        : request.Nickname;

                var model = new GameRanking
                {
                    Nickname = finalNickname,
                    Score = request.Score,
                    CreatedAt = DateTime.UtcNow,
                };

                var response = await _supabaseClient.From<GameRanking>().Insert(model);
                var created = response.Models.FirstOrDefault();

                if (created == null)
                {
                    return StatusCode(500, new { message = "Failed to create ranking record." });
                }

                return Ok(
                    new GameRankingResponse
                    {
                        Id = created.Id,
                        Nickname = created.Nickname,
                        Score = created.Score,
                        CreatedAt = created.CreatedAt,
                    }
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.ToString() });
            }
        }

        private string ComputeHmacSha256(string data, string key)
        {
            using (
                var hmac = new System.Security.Cryptography.HMACSHA256(
                    System.Text.Encoding.UTF8.GetBytes(key)
                )
            )
            {
                var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
                return Convert.ToBase64String(hash);
            }
        }

        private class GameStartPayload
        {
            public long startedAt { get; set; }
            public string nonce { get; set; }
        }
    }

    public class GameRankingRequest
    {
        public string Nickname { get; set; } = string.Empty;
        public double Score { get; set; }

        // ★ 추가된 필드
        public string Token { get; set; } = string.Empty;
    }

    public class GameRankingResponse
    {
        public long Id { get; set; }
        public string Nickname { get; set; } = string.Empty;
        public double Score { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
