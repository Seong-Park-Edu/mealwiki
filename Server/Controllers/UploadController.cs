using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System;
using System.IO;
using System.Threading.Tasks;

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
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("파일이 없습니다.");

            try
            {
                // ★ 여기가 핵심 수정 사항입니다 ★
                // 파일명에서 한글/특수문자를 제거하고 안전한 랜덤 이름으로 바꿉니다.
                // 예: "사진.jpg" -> ".jpg" -> "uuid-uuid.jpg"
                var extension = Path.GetExtension(file.FileName); // .png, .jpg 등 가져오기
                var fileName = $"{Guid.NewGuid()}{extension}"; 

                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();

                // Supabase에 업로드
                await _supabase.Storage
                    .From("food-images")
                    .Upload(fileBytes, fileName);

                // 공개 URL 가져오기
                var publicUrl = _supabase.Storage
                    .From("food-images")
                    .GetPublicUrl(fileName);

                return Ok(new { url = publicUrl });
            }
            catch (Exception ex)
            {
                // 에러 로그를 좀 더 자세히 봅니다.
                return StatusCode(500, $"업로드 실패: {ex.Message}");
            }
        }
    }
}