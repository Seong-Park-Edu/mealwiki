using Microsoft.AspNetCore.Mvc;
using Server.Models;
using Server.Services;

namespace Server.Controllers
{
    [Route("api/[controller]")] // 접속 주소: /api/food
    [ApiController]
    public class FoodController : ControllerBase
    {
        private readonly KakaoService _kakaoService;

        // 생성자: Program.cs에 등록한 KakaoService를 여기서 주입받습니다.
        public FoodController(KakaoService kakaoService)
        {
            _kakaoService = kakaoService;
        }

        // GET: api/food/search?keyword=강남역
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
            {
                return BadRequest("검색어를 입력해주세요.");
            }

            try
            {
                // 서비스에게 일을 시키고 결과를 기다립니다.
                var result = await _kakaoService.SearchRestaurantsAsync(keyword);
                return Ok(result);
            }
            catch (Exception ex)
            {
                // 에러가 나면 500 에러와 메시지를 반환합니다.
                return StatusCode(500, $"서버 에러 발생: {ex.Message}");
            }
        }
    }
}