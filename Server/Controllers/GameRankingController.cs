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

                // DTO 변환 (BaseModel 직렬화 오류 방지)
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

        // 점수 등록
        [HttpPost]
        public async Task<IActionResult> AddRanking([FromBody] GameRankingRequest request)
        {
            try
            {
                // [안전장치] 설정 확인
                var url = _configuration["Supabase:Url"];
                var key = _configuration["Supabase:Key"];

                if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
                {
                    return StatusCode(
                        500,
                        new
                        {
                            message = "Server Configuration Error: Supabase:Url or Supabase:Key is missing in Azure Settings.",
                        }
                    );
                }

                // 간단한 유효성 검사
                if (string.IsNullOrWhiteSpace(request.Nickname) || request.Score <= 0)
                {
                    return BadRequest("Invalid data.");
                }

                // 닉네임 길이 제한
                string finalNickname = request.Nickname;
                if (finalNickname.Length > 10)
                {
                    finalNickname = finalNickname.Substring(0, 10);
                }

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
    }

    // 요청 DTO
    public class GameRankingRequest
    {
        public string Nickname { get; set; } = string.Empty;
        public double Score { get; set; }
    }

    // 응답 DTO
    public class GameRankingResponse
    {
        public long Id { get; set; }
        public string Nickname { get; set; } = string.Empty;
        public double Score { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
