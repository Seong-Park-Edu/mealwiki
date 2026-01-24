using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;
using Server.Models;

namespace Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly Supabase.Client _supabase;

        public UploadController(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [HttpPost]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile file, [FromForm] string restaurantId, [FromForm] string nickname)
        {
            // 1. 유효성 검사 (데이터가 하드웨어에서 잘 넘어왔는지 확인)
            if (file == null || file.Length == 0) return BadRequest("파일이 없습니다.");
            if (string.IsNullOrEmpty(restaurantId)) return BadRequest("식당 ID가 없습니다.");

            try
            {
                // 2. 파일명 처리 (랜덤 UUID 사용으로 충돌 방지)
                var extension = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{extension}";

                // ★ 핵심: 버킷 안의 '식당ID' 폴더 구조로 업로드 경로 설정
                var uploadPath = $"{restaurantId}/{fileName}";

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                // 3. 하드웨어 스토리지 업로드 (폴더 경로 포함)
                await _supabase.Storage
                    .From("food-images")
                    .Upload(fileBytes, uploadPath);

                // 4. 공개 URL 가져오기
                var publicUrl = _supabase.Storage
                    .From("food-images")
                    .GetPublicUrl(uploadPath);

                // 5. ★ 소프트웨어 DB(wiki_images)에 레코드 저장
                // 닉네임을 통해 유저 정보를 먼저 가져옵니다.
                var userRes = await _supabase.From<User>().Where(u => u.Nickname == nickname).Get();
                var user = userRes.Models.FirstOrDefault();

                if (user != null)
                {
                    var newImageRecord = new WikiImage
                    {
                        RestaurantId = restaurantId,
                        ImageUrl = publicUrl,
                        UserId = user.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _supabase.From<WikiImage>().Insert(newImageRecord);
                }

                return Ok(new { url = publicUrl });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"업로드 및 DB 저장 실패: {ex.Message}");
            }
        }
    }
}