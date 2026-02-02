using Supabase.Postgrest.Attributes; // 이 네임스페이스가 필수입니다!
using Supabase.Postgrest.Models;     // BaseModel이 여기 들어있습니다.

namespace Server.Models
{
    // Supabase 테이블 이름 매핑
    [Table("commercial_stats")]
    public class CommercialStat: BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("market_name")]
        public string MarketName { get; set; } // 상권명

        [Column("category_name")]
        public string CategoryName { get; set; } // 업종명

        [Column("monthly_sales")]
        public long MonthlySales { get; set; } // 월 매출 (가장 중요!)

        [Column("lat")]
        public double Lat { get; set; }

        [Column("lng")]
        public double Lng { get; set; }
    }
}