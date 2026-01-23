using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("restaurants")]
    public class Restaurant : BaseModel
    {
        [PrimaryKey("id")]
        public string Id { get; set; }

        [Column("name")]
        public string Name { get; set; }

        [Column("address")]
        public string Address { get; set; }

        [Column("ack_count")]
        public int AckCount { get; set; }

        [Column("x")] 
        public string X { get; set; } 
        
        [Column("y")] 
        public string Y { get; set; }
    }
    
}