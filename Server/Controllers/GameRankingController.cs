using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
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

                return Ok(result.Models);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.ToString() });
            }
        }

        // 점수 등록
        [HttpPost]
        public async Task<IActionResult> AddRanking([FromBody] GameRanking ranking)
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
                if (string.IsNullOrWhiteSpace(ranking.Nickname) || ranking.Score <= 0)
                {
                    return BadRequest("Invalid data.");
                }

                // 닉네임 길이 제한
                if (ranking.Nickname.Length > 10)
                {
                    ranking.Nickname = ranking.Nickname.Substring(0, 10);
                }

                var response = await _supabaseClient.From<GameRanking>().Insert(ranking);

                return Ok(response.Models.FirstOrDefault());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.ToString() });
            }
        }
    }
}
