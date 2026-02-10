using Microsoft.AspNetCore.Mvc;
using Server.Models;
using Supabase;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameRankingController : ControllerBase
    {
        private readonly Client _supabaseClient;

        public GameRankingController(Client supabaseClient)
        {
            _supabaseClient = supabaseClient;
        }

        // TOP 10 랭킹 조회
        [HttpGet]
        public async Task<IActionResult> GetRankings()
        {
            try
            {
                var result = await _supabaseClient
                    .From<GameRanking>()
                    .Order("score", Postgrest.Constants.Ordering.Descending)
                    .Limit(10)
                    .Get();

                return Ok(result.Models);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 점수 등록
        [HttpPost]
        public async Task<IActionResult> AddRanking([FromBody] GameRanking ranking)
        {
            try
            {
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

                var response = await _supabaseClient
                    .From<GameRanking>()
                    .Insert(ranking);

                return Ok(response.Models.FirstOrDefault());
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
