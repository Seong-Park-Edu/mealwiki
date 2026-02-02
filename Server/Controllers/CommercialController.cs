using Microsoft.AspNetCore.Authorization; // ★ [AllowAnonymous]를 위해 필수
using Microsoft.AspNetCore.Mvc;
using Server.Models; // CommercialStat 모델이 있는 곳
using System.Threading.Tasks;
using System.Linq;

// ★★★ 네임스페이스 추가 (이게 없어서 인식이 안 됐습니다!)
namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // ★★★ "누구나 접속 가능" (403 해결의 핵심 열쇠)
    public class CommercialController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public CommercialController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            // 1. DB에서 데이터 가져오기 (Supabase 객체 그대로)
            var response = await _supabase
                .From<CommercialStat>()
                .Select("id, market_name, category_name, monthly_sales, lat, lng")
                .Get();

            // 2. ★ [핵심 수정] 복잡한 Supabase 객체를 "깨끗한 데이터 객체"로 변환하기
            // 이렇게 하면 'BaseModel'의 복잡한 껍데기는 버리고 알맹이만 남습니다.
            var cleanData = response.Models.Select(item => new
            {
                id = item.Id,
                market_name = item.MarketName,
                category_name = item.CategoryName,
                monthly_sales = item.MonthlySales,
                lat = item.Lat,
                lng = item.Lng
            });

            // 3. 변환된 깨끗한 데이터를 반환
            return Ok(cleanData);
        }
    }
}